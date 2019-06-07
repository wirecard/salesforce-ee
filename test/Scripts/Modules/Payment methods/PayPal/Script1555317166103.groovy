import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import internal.GlobalVariable as GlobalVariable

WebUI.delay(10)

if (WebUI.verifyElementPresent(findTestObject('Payment methods/PayPal/Username'), 5, FailureHandling.OPTIONAL)) {
	WebUI.setText(findTestObject('Payment methods/PayPal/Username'), username)
	
	WebUI.setText(findTestObject('Payment methods/PayPal/Password'), password)
	
	WebUI.click(findTestObject('Payment methods/PayPal/Login'))

} else {
	WebUI.setText(findTestObject('Payment methods/PayPal/Username (split)'), username)
	
	WebUI.click(findTestObject('Payment methods/PayPal/Continue to Password'))
	
	WebUI.delay(2)
	
	WebUI.waitForElementVisible(findTestObject('Payment methods/PayPal/Password (split)'), 10)
	
	WebUI.setText(findTestObject('Payment methods/PayPal/Password (split)'), password)
	
	WebUI.click(findTestObject('Payment methods/PayPal/Continue Login'))
}

WebUI.delay(10)

WebUI.waitForElementClickable(findTestObject('Payment methods/PayPal/Pay button'), 10)

WebUI.click(findTestObject('Payment methods/PayPal/Pay button'))

