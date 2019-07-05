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

if (WebUI.verifyElementPresent(findTestObject('Payment methods/Sofort/Select Country'), 30, FailureHandling.OPTIONAL)) {

	WebUI.selectOptionByValue(findTestObject('Payment methods/Sofort/Select Country'), 'DE', false)

}

if (WebUI.verifyElementPresent(findTestObject('Payment methods/Sofort/Bank code search'), 10, FailureHandling.OPTIONAL)) {

	WebUI.setText(findTestObject('Payment methods/Sofort/Bank code search'), '88888888')

}

if (WebUI.verifyElementPresent(findTestObject('Payment methods/Sofort/Continue Select Account'), 10, FailureHandling.OPTIONAL)) {
	
	WebUI.click(findTestObject('Payment methods/Sofort/Continue Select Account'))
	
}

WebUI.waitForElementPresent(findTestObject('Payment methods/Sofort/Login (name)'), 10)

WebUI.setText(findTestObject('Payment methods/Sofort/Login (name)'), '23213213213')

WebUI.setText(findTestObject('Payment methods/Sofort/Login (password)'), '331321')

WebUI.click(findTestObject('Payment methods/Sofort/Continue Select Account'))

WebUI.waitForElementPresent(findTestObject('Payment methods/Sofort/Select Account-1'), 10)

WebUI.click(findTestObject('Payment methods/Sofort/Select Account-1'))

WebUI.delay(3)

WebUI.waitForElementClickable(findTestObject('Payment methods/Sofort/Continue Select Account'), 10)

WebUI.click(findTestObject('Payment methods/Sofort/Continue Select Account'))

WebUI.waitForElementPresent(findTestObject('Payment methods/Sofort/Tan'), 10)

WebUI.setText(findTestObject('Payment methods/Sofort/Tan'), '12345')

WebUI.click(findTestObject('Payment methods/Sofort/Continue Select Account'))

