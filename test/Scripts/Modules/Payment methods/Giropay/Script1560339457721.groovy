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

WebUI.delay(5)

WebUI.waitForElementVisible(findTestObject('Payment methods/Giropay/Input sc'), 5)

WebUI.setText(findTestObject('Payment methods/Giropay/Input sc'), '10')

WebUI.setText(findTestObject('Payment methods/Giropay/Input extensionSc'), '4000')

WebUI.setText(findTestObject('Payment methods/Giropay/Input customerName1'), 'Rainer Zufall')

WebUI.setText(findTestObject('Payment methods/Giropay/Input customerIBAN'), 'NL13TEST0123456789')

WebUI.click(findTestObject('Payment methods/Giropay/Submit'))

